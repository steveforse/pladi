# frozen_string_literal: true

module Plex
  class MediaScope
    SHOW_VIEW_MODES = %w[shows episodes].freeze

    def self.movies
      new(library_type: 'movie')
    end

    def self.shows(view_mode)
      new(library_type: 'show', view_mode: view_mode)
    end

    attr_reader :library_type, :view_mode

    def initialize(library_type:, view_mode: nil)
      @library_type = library_type
      @view_mode = normalize_view_mode(view_mode)
    end

    def cache_key_parts
      [library_type, view_mode]
    end

    def update_media_type
      episode_view? ? 'episode' : library_type
    end

    def show_library?
      library_type == 'show'
    end

    def movie_library?
      library_type == 'movie'
    end

    def include_image_cache?
      movie_library?
    end

    def resource_name
      return 'Episode' if episode_view?
      return 'Show' if show_library?

      'Movie'
    end

    def accepts_media_type?(media_type)
      accepted_media_types.include?(media_type)
    end

    def episode_view?
      show_library? && view_mode == 'episodes'
    end

    def ==(other)
      other.is_a?(self.class) &&
        library_type == other.library_type &&
        view_mode == other.view_mode
    end
    alias eql? ==

    def hash
      [library_type, view_mode].hash
    end

    private

    def accepted_media_types
      return ['episode'] if episode_view?
      return ['show'] if show_library?

      ['movie']
    end

    def normalize_view_mode(value)
      return 'shows' unless show_library?

      SHOW_VIEW_MODES.include?(value) ? value : 'shows'
    end
  end
end
