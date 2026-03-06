# frozen_string_literal: true

module Api
  class HistoryController < BaseController
    def index
      logs = Current.user.media_audit_logs
        .includes(:plex_server)
        .recent
        .limit(1000)
      render json: HistoryLogSerializer.serialize(logs)
    end
  end
end
