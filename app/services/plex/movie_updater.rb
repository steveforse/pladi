# frozen_string_literal: true

module Plex
  class MovieUpdater
    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def update_movie(movie_id, fields)
      before = fetch_movie_snapshot(movie_id)
      @http.put("/library/metadata/#{movie_id}?#{build_update_query(fields)}")
      @cache.bump_enrich_version
      after = fetch_movie_snapshot(movie_id)
      { before: before, after: after, unverified_fields: verify_fields(fields, after) }
    end

    def fetch_movie_snapshot(movie_id)
      item = @http.get("/library/metadata/#{movie_id}")
        .dig('MediaContainer', 'Metadata', 0) || {}
      extract_snapshot(item)
    end

    private

    def build_update_query(fields)
      scalar_pairs  = [%w[type 1]]
      raw_tag_parts = []
      fields.each { |key, value| collect_field_parts(key.to_s, value, scalar_pairs, raw_tag_parts) }
      ([URI.encode_www_form(scalar_pairs)] + raw_tag_parts).join('&')
    end

    # rubocop:disable Metrics/MethodLength
    def collect_field_parts(key, value, scalar_pairs, raw_tag_parts)
      if (plex_param = Plex::FieldMaps::SCALAR_FIELD_MAP[key])
        scalar_pairs << ["#{plex_param}.value", value.to_s]
        scalar_pairs << ["#{plex_param}.locked", '1']
      elsif (tag_name = Plex::FieldMaps::TAG_FIELD_MAP[key])
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
    # rubocop:enable Metrics/MethodLength

    def verify_fields(fields, snapshot)
      fields.filter_map do |key, value|
        field = key.to_s
        if Plex::FieldMaps::TAG_FIELD_MAP.key?(field)
          expected = Array(value).map(&:to_s).compact_blank.sort
          field unless expected == snapshot[field]
        elsif Plex::FieldMaps::SCALAR_FIELD_MAP.key?(field)
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
      Plex::FieldMaps::SCALAR_FIELD_MAP.each_key do |key|
        plex_attr     = Plex::FieldMaps::SCALAR_FIELD_MAP[key]
        snapshot[key] = item[plex_attr].to_s
      end
      Plex::FieldMaps::TAG_FIELD_MAP.each_key do |key|
        tag_name      = Plex::FieldMaps::TAG_FIELD_MAP[key]
        snapshot[key] = (item[tag_name] || []).pluck('tag').compact_blank.sort
      end
      snapshot
    end
    # rubocop:enable Metrics/MethodLength, Metrics/AbcSize
  end
end
