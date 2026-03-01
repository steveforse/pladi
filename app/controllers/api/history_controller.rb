# frozen_string_literal: true

module Api
  class HistoryController < ApplicationController
    before_action :require_authentication

    def index
      logs = Current.user.movie_audit_logs
        .includes(:plex_server)
        .recent
        .limit(1000)
      render json: logs.as_json(
        only: %i[id field_name field_type old_value new_value created_at movie_id movie_title section_title],
        include: { plex_server: { only: %i[id name] } }
      )
    end
  end
end
