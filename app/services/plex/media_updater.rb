# frozen_string_literal: true

module Plex
  class MediaUpdater
    PLEX_TYPE_IDS = {
      'movie' => '1',
      'show' => '2',
      'episode' => '4'
    }.freeze

    def initialize(http_client, cache_store)
      @http  = http_client
      @cache = cache_store
    end

    def update(media_id, fields, media_type:)
      before = snapshot_for(media_id)
      @http.put("/library/metadata/#{media_id}?#{build_update_query(fields, media_type: media_type)}")
      @cache.bump_enrich_version
      after = snapshot_for(media_id)

      { before: before, after: after, unverified_fields: verify_fields(fields, after) }
    end

    def snapshot_for(media_id)
      item = @http.get("/library/metadata/#{media_id}")
        .dig('MediaContainer', 'Metadata', 0) || {}
      extract_snapshot(item)
    end

    private

    def build_update_query(fields, media_type:)
      scalar_pairs  = [['type', PLEX_TYPE_IDS.fetch(media_type)]]
      raw_tag_parts = []

      fields.each do |key, value|
        collect_field_parts(key.to_s, value, scalar_pairs, raw_tag_parts)
      end

      ([URI.encode_www_form(scalar_pairs)] + raw_tag_parts).join('&')
    end

    def collect_field_parts(key, value, scalar_pairs, raw_tag_parts)
      if (plex_param = Plex::MediaUpdateFields::SCALAR_FIELD_MAP[key])
        scalar_pairs << ["#{plex_param}.value", value.to_s]
        scalar_pairs << ["#{plex_param}.locked", '1']
      elsif (tag_name = Plex::MediaTagFields::UPDATE_TAG_MAP[key])
        append_tag_parts(tag_name.downcase, Array(value), raw_tag_parts)
      end
    end

    def append_tag_parts(field_name, tags, raw_tag_parts)
      if tags.empty?
        # Send one empty entry to trigger Plex's replacement mode; without any
        # entries Plex only locks the field in place rather than clearing it.
        raw_tag_parts << "#{field_name}[0].tag.tag="
      else
        tags.each_with_index do |tag, index|
          raw_tag_parts << "#{field_name}[#{index}].tag.tag=#{CGI.escape(tag.to_s)}"
        end
      end

      raw_tag_parts << "#{field_name}.locked=1"
    end

    def verify_fields(fields, snapshot)
      fields.filter_map do |key, value|
        field = key.to_s

        if Plex::MediaTagFields::UPDATE_TAG_MAP.key?(field)
          expected = Array(value).map(&:to_s).compact_blank.sort
          field unless expected == snapshot[field]
        elsif Plex::MediaUpdateFields::SCALAR_FIELD_MAP.key?(field)
          field unless value.to_s == snapshot[field].to_s
        end
      end
    end

    def extract_snapshot(item)
      {
        section_id: item['librarySectionID'].to_s,
        section_title: item['librarySectionTitle'].to_s,
        media_title: item['title'].to_s
      }.merge(extract_scalar_fields(item))
        .merge(extract_tag_fields(item))
    end

    def extract_scalar_fields(item)
      Plex::MediaUpdateFields::SCALAR_FIELD_MAP.to_h do |field, plex_attribute|
        [field, item[plex_attribute].to_s]
      end
    end

    def extract_tag_fields(item)
      Plex::MediaTagFields::UPDATE_TAG_MAP.to_h do |field, plex_attribute|
        [field, Array(item[plex_attribute]).pluck('tag').compact_blank.sort]
      end
    end
  end
end
