# frozen_string_literal: true

class WarmPostersJob < WarmMediaImagesJob
  private

  def image_for(service, media_id)
    service.poster_for(media_id)
  end

  def channel_name(server_id)
    "posters_#{server_id}"
  end
end
