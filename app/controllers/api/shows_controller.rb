# frozen_string_literal: true

module Api
  class ShowsController < MediaLibrariesController
    private

    def resource_param_key
      :show
    end

    def media_scope
      Plex::MediaScope.shows(params[:view_mode])
    end

    def resource_name
      'Show'
    end
  end
end
