# frozen_string_literal: true

module Plex
  # rubocop:disable Metrics/ClassLength
  class Enricher
    ENRICH_THREADS = ENV.fetch('PLEX_ENRICH_THREADS', '3').to_i

    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def enrich_sections(sections)
      sections.map { |section| enrich_section(section) }
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

    def fetch_movie_detail(movie_id)
      item = @http.get("/library/metadata/#{movie_id}")
        .dig('MediaContainer', 'Metadata', 0) || {}
      parse_movie_detail(item)
    rescue StandardError
      {}
    end

    private

    # rubocop:disable Metrics/MethodLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
    def enrich_section(section)
      key = @cache.key('section', section[:id], section[:updated_at], 'enriched', @cache.enrich_version)
      @cache.fetch(key) do
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

        key    = @cache.key('movie', 'detail', movie[:id], movie[:updated_at], @cache.enrich_version)
        detail = @cache.fetch(key) { fetch_movie_detail(movie[:id]) }
        mutex.synchronize { result[movie[:id]] = detail }
      end
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
  end
  # rubocop:enable Metrics/ClassLength
end
