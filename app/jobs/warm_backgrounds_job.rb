# frozen_string_literal: true

class WarmBackgroundsJob < WarmMediaImagesJob
  private

  def image_for(service, media_id)
    service.background_for(media_id)
  end

  def channel_name(server_id)
    "backgrounds_#{server_id}"
  end
end
