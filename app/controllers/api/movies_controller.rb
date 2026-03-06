# frozen_string_literal: true

module Api
  class MoviesController < MediaLibrariesController
    def warm_posters
      prioritized = prioritized_movies
      WarmPostersJob.perform_later(@server.id, prioritized) if prioritized.any?
      head :ok
    end

    def warm_backgrounds
      prioritized = prioritized_movies
      WarmBackgroundsJob.perform_later(@server.id, prioritized) if prioritized.any?
      head :ok
    end

    private

    def resource_param_key
      :movie
    end

    def resource_extra_fields
      [:edition]
    end

    def media_scope
      Plex::MediaScope.movies
    end

    def prioritized_movies
      priority_ids = Array(params[:priority_ids]).map(&:to_s)
      movies = Array(params[:movies]).map { |m| m.permit(:id, :thumb, :art).to_h }
      movies.sort_by { |m| priority_ids.include?(m[:id].to_s) ? 0 : 1 }
    end
  end
end
