# frozen_string_literal: true

module Api
  class ShowsController < MediaLibrariesController
    private

    def resource_params
      params.expect(
        show: [:title, :original_title, :sort_title, :summary, :tagline,
               :studio, :content_rating, :year, :originally_available,
               { genres: [],
                 directors: [], writers: [], producers: [],
                 collections: [], labels: [], country: [] }]
      )
    end

    def hidden_enrichment_fields
      %i[cached_poster_ids uncached_poster_movies cached_background_ids uncached_background_movies]
    end

    def media_scope
      Plex::MediaScope.shows(params[:view_mode])
    end

    def resource_name
      'Show'
    end
  end
end
