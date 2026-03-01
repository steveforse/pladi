# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
class PlexService
  ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i
  CACHE_TTL = 30.days

  SCALAR_FIELD_MAP = {
    'title' => 'title', 'original_title' => 'originalTitle',
    'sort_title' => 'titleSort', 'year' => 'year',
    'edition' => 'editionTitle', 'summary' => 'summary',
    'tagline' => 'tagline', 'studio' => 'studio',
    'content_rating' => 'contentRating', 'critic_rating' => 'rating',
    'audience_rating' => 'audienceRating',
    'originally_available' => 'originallyAvailableAt'
  }.freeze

  TAG_FIELD_MAP = {
    'genres' => 'Genre', 'directors' => 'Director',
    'writers' => 'Writer', 'producers' => 'Producer',
    'collections' => 'Collection', 'labels' => 'Label',
    'country' => 'Country'
  }.freeze

  def initialize(server)
    @server    = server
    @http      = PlexHttp.new(server.url, server.token)
    @server_id = server.id
  end

  def friendly_name
    @http.get('/').dig('MediaContainer', 'friendlyName')
  end

  def cached_sections
    Rails.cache.fetch(cache_key('sections'), expires_in: CACHE_TTL) do
      sections
    end
  end

  def refresh_sections
    sections.tap do |data|
      Rails.cache.write(cache_key('sections'), data, expires_in: CACHE_TTL)
    end
  end

  def sections
    fetch_movie_sections.map do |section|
      section_id = section['key']
      updated_at = section['updatedAt']
      movies = cached_movies_for(section_id, updated_at)
      { id: section_id, updated_at: updated_at,
        title: section['title'], movies: movies }
    end
  end

  def enrich_sections(sections)
    sections.map { |section| enrich_section(section) }
  end

  def poster_for(movie_id)
    Rails.cache.fetch(cache_key('poster', movie_id), expires_in: CACHE_TTL) do
      thumb_path = @http
        .get("/library/metadata/#{movie_id}")
        .dig('MediaContainer', 'Metadata', 0, 'thumb')
      next nil unless thumb_path

      @http.fetch_poster_bytes(thumb_path)
    end
  rescue StandardError
    nil
  end

  def posters_cached(movie_ids)
    keys = movie_ids.index_by { |id| cache_key('poster', id) }
    hits = Rails.cache.read_multi(*keys.keys)
    keys.filter_map { |key, id| id if hits.key?(key) }.to_set
  end

  def warm_poster(movie_id, thumb_path)
    Rails.cache.fetch(cache_key('poster', movie_id), expires_in: CACHE_TTL) { @http.fetch_poster_bytes(thumb_path) }
  rescue StandardError
    nil
  end

  def fetch_movie_snapshot(movie_id)
    item = @http
      .get("/library/metadata/#{movie_id}")
      .dig('MediaContainer', 'Metadata', 0) || {}
    extract_snapshot(item)
  end

  def update_movie(movie_id, fields)
    before = fetch_movie_snapshot(movie_id)
    @http.put("/library/metadata/#{movie_id}?#{build_update_query(fields)}")
    bump_enrich_version
    after = fetch_movie_snapshot(movie_id)
    { before: before, after: after, unverified_fields: verify_fields(fields, after) }
  end

  private

  def cache_key(*parts)
    "plex/server/#{@server_id}/#{parts.join('/')}"
  end

  def enrich_version
    Rails.cache.read(cache_key('enrich_version')) || 0
  end

  def bump_enrich_version
    Rails.cache.write(cache_key('enrich_version'), enrich_version + 1, expires_in: CACHE_TTL)
  end

  def cached_movies_for(section_id, updated_at)
    Rails.cache.fetch(
      cache_key('section', section_id, updated_at, enrich_version),
      expires_in: CACHE_TTL
    ) do
      PlexSection.new(@server)
        .movies_for(section_id)
        .sort_by { |m| m[:title].downcase }
    end
  end

  def enrich_section(section)
    key = cache_key('section', section[:id], section[:updated_at], 'enriched', enrich_version)
    Rails.cache.fetch(key, expires_in: CACHE_TTL) do
      movies  = section[:movies]
      details = fetch_details_concurrently(movies)
      section.merge(
        movies: movies.map do |m|
          detail = details[m[:id]] || {}
          subtitles = detail[:subtitles_by_file]&.dig(m[:file_path])
          m.merge(detail.except(:subtitles_by_file)).merge(subtitles: subtitles)
        end
      )
    end
  end

  def fetch_details_concurrently(movies)
    queue  = movies.dup
    mutex  = Mutex.new
    result = {}

    Array.new(ENRICH_THREADS) do
      Thread.new { process_queue(queue, mutex, result) }
    end.each(&:join)

    result
  end

  def process_queue(queue, mutex, result)
    loop do
      movie = mutex.synchronize { queue.shift }
      break unless movie

      key    = cache_key('movie', 'detail', movie[:id], movie[:updated_at], enrich_version)
      detail = Rails.cache.fetch(key, expires_in: CACHE_TTL) do
        fetch_movie_detail(movie[:id])
      end
      mutex.synchronize { result[movie[:id]] = detail }
    end
  end

  def build_update_query(fields)
    scalar_pairs = [%w[type 1]]
    raw_tag_parts = []
    fields.each { |key, value| collect_field_parts(key.to_s, value, scalar_pairs, raw_tag_parts) }
    ([URI.encode_www_form(scalar_pairs)] + raw_tag_parts).join('&')
  end

  def collect_field_parts(key, value, scalar_pairs, raw_tag_parts)
    if (plex_param = SCALAR_FIELD_MAP[key])
      scalar_pairs << ["#{plex_param}.value", value.to_s]
      scalar_pairs << ["#{plex_param}.locked", '1']
    elsif (tag_name = TAG_FIELD_MAP[key])
      put_name = tag_name.downcase
      Array(value).each_with_index do |tag, i|
        raw_tag_parts << "#{put_name}[#{i}].tag.tag=#{CGI.escape(tag.to_s)}"
      end
      raw_tag_parts << "#{put_name}.locked=1"
    end
  end

  # An array of hashes representing the JSON payload for each movie section
  # (but not the movies themselves, which are fetched separately per section).
  def fetch_movie_sections
    payload   = @http.get('/library/sections')
    directory = payload.dig('MediaContainer', 'Directory') || []
    directory.select { |d| d['type'] == 'movie' }
  end

  def verify_fields(fields, snapshot)
    fields.filter_map do |key, value|
      field = key.to_s
      if TAG_FIELD_MAP.key?(field)
        field unless Array(value).map(&:to_s).sort == snapshot[field].sort
      elsif SCALAR_FIELD_MAP.key?(field)
        field unless value.to_s == snapshot[field].to_s
      end
    end
  end

  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
  def extract_snapshot(item)
    snapshot = {
      section_id: item['librarySectionID'].to_s,
      section_title: item['librarySectionTitle'].to_s,
      movie_title: item['title'].to_s
    }
    SCALAR_FIELD_MAP.each_key do |key|
      plex_attr = SCALAR_FIELD_MAP[key]
      snapshot[key] = item[plex_attr].to_s
    end
    TAG_FIELD_MAP.each_key do |key|
      tag_name = TAG_FIELD_MAP[key]
      snapshot[key] = (item[tag_name] || []).pluck('tag').sort
    end
    snapshot
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize

  def fetch_movie_detail(movie_id)
    item = @http
      .get("/library/metadata/#{movie_id}")
      .dig('MediaContainer', 'Metadata', 0) || {}
    parse_movie_detail(item)
  rescue StandardError
    {}
  end

  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity
  def parse_movie_detail(item)
    subtitles_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        sub_streams = (part['Stream'] || []).select { |s| s['streamType'].to_s == '3' }
        subtitle_str = sub_streams.map { |s| "#{s['displayTitle'] || s['language'] || s['languageTag']} (#{s['codec']&.upcase})" }.uniq.join(', ')
        acc[part['file']] = subtitle_str.presence
      end
    end
    {
      subtitles_by_file: subtitles_by_file,
      summary: item['summary'],
      content_rating: item['contentRating'],
      audience_rating: item['audienceRating'],
      edition: item['editionTitle'],
      genres: (item['Genre'] || []).pluck('tag').join(', '),
      directors: (item['Director'] || []).pluck('tag').join(', '),
      country: (item['Country'] || []).pluck('tag').join(', '),
      writers: (item['Writer'] || []).pluck('tag').join(', '),
      producers: (item['Producer'] || []).pluck('tag').join(', '),
      collections: (item['Collection'] || []).pluck('tag').join(', '),
      labels: (item['Label'] || []).pluck('tag').join(', ')
    }
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity
end
# rubocop:enable Metrics/ClassLength
