# frozen_string_literal: true

module Plex
  class LibraryRowBuilder
    def initialize(ratings_parser: RatingsParser.new, stream_info_summary: StreamInfoSummary.new)
      @ratings_parser = ratings_parser
      @stream_info_summary = stream_info_summary
    end

    def build_movie(item:, media:, part:, plex_url:)
      base_row(item: item, plex_url: plex_url)
        .merge(file_row(media: media, part: part))
        .merge(
          show_title: nil,
          episode_number: nil,
          edition: item['editionTitle'],
          season_count: nil,
          episode_count: nil,
          viewed_episode_count: nil
        )
    end

    def build_show(item:, plex_url:)
      base_row(item: item, plex_url: plex_url)
        .merge(LibraryRowFields::EMPTY_FILE_ROW)
        .merge(
          show_title: nil,
          episode_number: nil,
          edition: nil,
          season_count: item['childCount'],
          episode_count: item['leafCount'],
          viewed_episode_count: item['viewedLeafCount']
        )
    end

    def build_episode(item:, media:, part:, plex_url:)
      base_row(item: item, plex_url: plex_url)
        .merge(file_row(media: media, part: part))
        .merge(
          episode_overrides(item)
        )
        .merge(tag_fields(item))
        .merge(@ratings_parser.parse(item))
        .merge(@stream_info_summary.build(part))
    end

    private

    def base_row(item:, plex_url:)
      map_fields(item, LibraryRowFields::BASE_FIELD_MAP).merge(plex_url: plex_url)
    end

    def file_row(media:, part:)
      map_fields(media, LibraryRowFields::FILE_FIELD_MAP.except(:file_path, :size))
        .merge(map_fields(part, file_part_field_map))
    end

    def tag_fields(item)
      LibraryRowFields::TAG_FIELDS.transform_values { |key| TagFormatter.join(item[key]) }
    end

    def episode_code(item)
      season = item['parentIndex']
      episode = item['index']
      return nil unless season && episode

      format('S%<season>02dE%<episode>02d', season:, episode:)
    end

    def episode_overrides(item)
      {
        original_title: nil,
        show_title: item['grandparentTitle'],
        episode_number: episode_code(item),
        edition: nil,
        year: item['year'] || item['parentYear'],
        thumb: item['thumb'] || item['grandparentThumb'],
        art: item['art'] || item['grandparentArt']
      }.merge(episode_progress(item))
    end

    def episode_progress(item)
      {
        season_count: item['parentIndex'],
        episode_count: item['index'],
        viewed_episode_count: item['viewCount'],
        tagline: nil
      }
    end

    def map_fields(source, field_map)
      field_map.to_h { |name, key| [name, source[key]] }
    end

    def file_part_field_map
      { file_path: 'file', size: 'size' }
    end
  end
end
