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
    'content_rating' => 'contentRating',
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
    @server_id = server.id
  end

  def friendly_name
    plex_get('/').dig('MediaContainer', 'friendlyName')
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
    Rails.cache.fetch(cache_key('poster', movie_id), expires_in: CACHE_TTL, skip_nil: true) do
      plex_get_image("/library/metadata/#{movie_id}/thumb")
    end
  rescue StandardError
    nil
  end

  def posters_cached(movie_ids)
    keys = movie_ids.index_by { |id| cache_key('poster', id) }
    hits = Rails.cache.read_multi(*keys.keys)
    keys.filter_map { |key, id| id if hits.key?(key) }.to_set
  end

  def warm_poster(movie_id)
    Rails.cache.fetch(cache_key('poster', movie_id), expires_in: CACHE_TTL, skip_nil: true) do
      plex_get_image("/library/metadata/#{movie_id}/thumb")
    end
  rescue StandardError
    nil
  end

  def background_for(movie_id)
    Rails.cache.fetch(cache_key('background', movie_id), expires_in: CACHE_TTL, skip_nil: true) do
      plex_get_image("/library/metadata/#{movie_id}/art")
    end
  rescue StandardError
    nil
  end

  def backgrounds_cached(movie_ids)
    keys = movie_ids.index_by { |id| cache_key('background', id) }
    hits = Rails.cache.read_multi(*keys.keys)
    keys.filter_map { |key, id| id if hits.key?(key) }.to_set
  end

  def poster_cache_partition(sections)
    all_movies    = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
    poster_movies = all_movies.filter_map { |m| { id: m[:id], thumb: m[:thumb] } if m[:thumb] }
    cached_ids    = posters_cached(poster_movies.pluck(:id))
    poster_movies.partition { |m| cached_ids.include?(m[:id]) }
  end

  def background_cache_partition(sections)
    all_movies        = sections.flat_map { |s| s[:movies] }.uniq { |m| m[:id] }
    background_movies = all_movies.filter_map { |m| { id: m[:id], art: m[:art] } if m[:art] }
    cached_ids        = backgrounds_cached(background_movies.pluck(:id))
    background_movies.partition { |m| cached_ids.include?(m[:id]) }
  end

  def warm_background(movie_id)
    Rails.cache.fetch(cache_key('background', movie_id), expires_in: CACHE_TTL, skip_nil: true) do
      plex_get_image("/library/metadata/#{movie_id}/art")
    end
  rescue StandardError
    nil
  end

  def fetch_movie_snapshot(movie_id)
    item = plex_get("/library/metadata/#{movie_id}")
      .dig('MediaContainer', 'Metadata', 0) || {}
    extract_snapshot(item)
  end

  def detail_for(movie_id)
    movie = cached_sections.flat_map { |s| s[:movies] }.find { |m| m[:id].to_s == movie_id.to_s }
    return nil unless movie

    enrich_movie(movie_id, movie[:file_path])
  end

  def update_movie(movie_id, fields)
    before = fetch_movie_snapshot(movie_id)
    plex_put("/library/metadata/#{movie_id}?#{build_update_query(fields)}")
    bump_enrich_version
    after = fetch_movie_snapshot(movie_id)
    { before: before, after: after, unverified_fields: verify_fields(fields, after) }
  end

  OPEN_TIMEOUT = 5
  READ_TIMEOUT = 30

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

  def fetch_movie_sections
    payload = plex_get('/library/sections')
    (payload.dig('MediaContainer', 'Directory') || []).select { |d| d['type'] == 'movie' }
  end

  def cached_movies_for(section_id, updated_at)
    Rails.cache.fetch(
      cache_key('section', section_id, updated_at, enrich_version),
      expires_in: CACHE_TTL
    ) do
      movies_for_section(section_id).sort_by { |m| m[:title].downcase }
    end
  end

  def machine_id
    @machine_id ||= plex_get('/identity').dig('MediaContainer', 'machineIdentifier')
  end

  def plex_url_for(movie_id)
    escaped = CGI.escape("/library/metadata/#{movie_id}")
    "https://app.plex.tv/desktop/#!/server/#{machine_id}/details?key=#{escaped}"
  end

  def movies_for_section(section_key)
    data  = plex_get("/library/sections/#{section_key}/all")
    items = data.dig('MediaContainer', 'Metadata') || []
    items.flat_map do |item|
      plex_url = plex_url_for(item['ratingKey'])
      (item['Media'] || []).flat_map do |media|
        (media['Part'] || []).map { |part| build_movie_hash(item, media, part, plex_url) }
      end
    end
  end

  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize
  def build_movie_hash(item, media, part, plex_url)
    {
      id: item['ratingKey'],
      title: item['title'],
      original_title: item['originalTitle'],
      year: item['year'],
      file_path: part['file'],
      container: media['container'],
      video_codec: media['videoCodec'],
      video_resolution: media['videoResolution'],
      width: media['width'],
      height: media['height'],
      aspect_ratio: media['aspectRatio'],
      frame_rate: media['videoFrameRate'],
      audio_codec: media['audioCodec'],
      audio_channels: media['audioChannels'],
      overall_bitrate: media['bitrate'],
      size: part['size'],
      duration: media['duration'],
      sort_title: item['titleSort'],
      originally_available: item['originallyAvailableAt'],
      studio: item['studio'],
      tagline: item['tagline'],
      updated_at: item['updatedAt'],
      thumb: item['thumb'],
      art: item['art'],
      plex_url: plex_url
    }
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize

  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
  def enrich_section(section)
    key = cache_key('section', section[:id], section[:updated_at], 'enriched', enrich_version)
    Rails.cache.fetch(key, expires_in: CACHE_TTL) do
      movies  = section[:movies]
      details = fetch_details_concurrently(movies)
      section.merge(
        movies: movies.map do |m|
          detail = details[m[:id]] || {}
          subtitles      = detail[:subtitles_by_file]&.dig(m[:file_path])
          audio_tracks   = detail[:audio_by_file]&.dig(m[:file_path])
          audio_language = detail[:audio_language_by_file]&.dig(m[:file_path])
          audio_bitrate  = detail[:audio_bitrate_by_file]&.dig(m[:file_path])
          video_bitrate  = detail[:video_bitrate_by_file]&.dig(m[:file_path])
          stream_keys = %i[subtitles_by_file audio_by_file
                           audio_language_by_file audio_bitrate_by_file video_bitrate_by_file]
          m.merge(detail.except(*stream_keys))
            .merge(subtitles: subtitles, audio_tracks: audio_tracks, audio_language: audio_language,
                   audio_bitrate: audio_bitrate, video_bitrate: video_bitrate)
        end
      )
    end
  end

  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

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

  def fetch_movie_detail(movie_id)
    item = plex_get("/library/metadata/#{movie_id}")
      .dig('MediaContainer', 'Metadata', 0) || {}
    parse_movie_detail(item)
  rescue StandardError
    {}
  end

  def enrich_movie(movie_id, file_path)
    raw = fetch_movie_detail(movie_id)
    stream_keys = %i[subtitles_by_file audio_by_file audio_language_by_file
                     audio_bitrate_by_file video_bitrate_by_file]
    raw.except(*stream_keys).merge(
      subtitles: raw[:subtitles_by_file]&.dig(file_path),
      audio_tracks: raw[:audio_by_file]&.dig(file_path),
      audio_language: raw[:audio_language_by_file]&.dig(file_path),
      audio_bitrate: raw[:audio_bitrate_by_file]&.dig(file_path),
      video_bitrate: raw[:video_bitrate_by_file]&.dig(file_path)
    )
  end

  # rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
  def parse_movie_detail(item)
    subtitles_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        sub_streams  = (part['Stream'] || []).select { |s| s['streamType'].to_s == '3' }
        subtitle_str = sub_streams.map do |s|
          "#{s['displayTitle'] || s['language'] || s['languageTag']} (#{s['codec']&.upcase})"
        end.uniq.join(', ')
        acc[part['file']] = subtitle_str.presence
      end
    end
    video_bitrate_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        video_stream = (part['Stream'] || []).find { |s| s['streamType'].to_s == '1' }
        acc[part['file']] = video_stream&.dig('bitrate')
      end
    end
    audio_language_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        selected = (part['Stream'] || []).find { |s| s['streamType'].to_s == '2' && s['selected'] }
        acc[part['file']] = selected && (selected['language'] || selected['languageTag'])
      end
    end
    audio_bitrate_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        selected = (part['Stream'] || []).find { |s| s['streamType'].to_s == '2' && s['selected'] }
        acc[part['file']] = selected&.dig('bitrate')
      end
    end
    audio_by_file = (item['Media'] || []).each_with_object({}) do |media, acc|
      (media['Part'] || []).each do |part|
        audio_streams = (part['Stream'] || []).select { |s| s['streamType'].to_s == '2' }
        audio_str = audio_streams.map do |s|
          lang    = s['language'] || s['languageTag']
          details = [
            s['codec']&.upcase,
            s['audioChannelLayout'] || (s['channels'] && "#{s['channels']}ch"),
            s['bitrate'] && "#{s['bitrate']} kbps"
          ].compact.join(', ')
          details.present? ? "#{lang} (#{details})" : lang
        end.uniq.join(', ')
        acc[part['file']] = audio_str.presence
      end
    end
    ratings = item['Rating'] || []
    imdb_rating = ratings.find { |r| r['image'].to_s.start_with?('imdb://') }&.dig('value')
    rt_critics_rating = ratings.find do |r|
      r['image'].to_s.start_with?('rottentomatoes://') && r['type'] == 'critic'
    end&.dig('value')
    rt_audience_rating = ratings.find do |r|
      r['image'].to_s.start_with?('rottentomatoes://') && r['type'] == 'audience'
    end&.dig('value')
    tmdb_rating = ratings.find { |r| r['image'].to_s.start_with?('themoviedb://') }&.dig('value')
    {
      subtitles_by_file: subtitles_by_file,
      audio_by_file: audio_by_file,
      audio_language_by_file: audio_language_by_file,
      audio_bitrate_by_file: audio_bitrate_by_file,
      video_bitrate_by_file: video_bitrate_by_file,
      summary: item['summary'],
      content_rating: item['contentRating'],
      imdb_rating: imdb_rating,
      rt_critics_rating: rt_critics_rating,
      rt_audience_rating: rt_audience_rating,
      tmdb_rating: tmdb_rating,
      edition: item['editionTitle'],
      genres: (item['Genre'] || []).pluck('tag').compact_blank.join(', '),
      directors: (item['Director'] || []).pluck('tag').compact_blank.join(', '),
      country: (item['Country'] || []).pluck('tag').compact_blank.join(', '),
      writers: (item['Writer'] || []).pluck('tag').compact_blank.join(', '),
      producers: (item['Producer'] || []).pluck('tag').compact_blank.join(', '),
      collections: (item['Collection'] || []).pluck('tag').compact_blank.join(', '),
      labels: (item['Label'] || []).pluck('tag').compact_blank.join(', ')
    }
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

  def build_update_query(fields)
    scalar_pairs  = [%w[type 1]]
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
      tags = Array(value)
      if tags.empty?
        # Send one empty entry to trigger Plex's replacement mode; without any
        # entries Plex only locks the field in place rather than clearing it.
        raw_tag_parts << "#{put_name}[0].tag.tag="
      else
        tags.each_with_index do |tag, i|
          raw_tag_parts << "#{put_name}[#{i}].tag.tag=#{CGI.escape(tag.to_s)}"
        end
      end
      raw_tag_parts << "#{put_name}.locked=1"
    end
  end

  def verify_fields(fields, snapshot)
    fields.filter_map do |key, value|
      field = key.to_s
      if TAG_FIELD_MAP.key?(field)
        expected = Array(value).map(&:to_s).compact_blank.sort
        field unless expected == snapshot[field]
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
      plex_attr     = SCALAR_FIELD_MAP[key]
      snapshot[key] = item[plex_attr].to_s
    end
    TAG_FIELD_MAP.each_key do |key|
      tag_name      = TAG_FIELD_MAP[key]
      snapshot[key] = (item[tag_name] || []).pluck('tag').compact_blank.sort
    end
    snapshot
  end
  # rubocop:enable Metrics/MethodLength, Metrics/AbcSize

  def plex_get_image(path)
    uri      = URI("#{@server.url}#{path}")
    response = image_get(uri, token: @server.token)
    response = follow_image_redirect(response) if response.is_a?(Net::HTTPRedirection)
    return nil unless response.is_a?(Net::HTTPSuccess)

    content_type = response['Content-Type'] || 'image/jpeg'
    { data: response.body.b, content_type: content_type }
  end

  def image_get(uri, token: nil)
    request = Net::HTTP::Get.new(uri)
    request['Accept'] = 'image/jpeg, image/png, image/*'
    request['X-Plex-Token'] = token if token
    http_start(uri) { |http| http.request(request) }
  end

  def follow_image_redirect(response)
    return response unless response['Location']

    redirect_uri = URI(response['Location'])
    image_get(redirect_uri)
  end

  def plex_get(path)
    uri     = URI("#{@server.url}#{path}")
    request = Net::HTTP::Get.new(uri)
    request['Accept']       = 'application/json'
    request['X-Plex-Token'] = @server.token
    response = http_start(uri) { |http| http.request(request) }
    raise "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  rescue JSON::ParserError
    raise 'Plex returned an unexpected response — check your server URL and token'
  end

  def plex_put(path)
    uri     = URI("#{@server.url}#{path}")
    request = Net::HTTP::Put.new(uri)
    request['Accept']       = 'application/json'
    request['X-Plex-Token'] = @server.token
    response = http_start(uri) { |http| http.request(request) }
    raise "Plex returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
  end

  def http_start(uri, &)
    Net::HTTP.start(
      uri.hostname, uri.port,
      use_ssl: uri.scheme == 'https',
      open_timeout: OPEN_TIMEOUT,
      read_timeout: READ_TIMEOUT,
      &
    )
  end
end
# rubocop:enable Metrics/ClassLength
