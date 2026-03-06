# frozen_string_literal: true

class WarmMediaImagesJob < ApplicationJob
  queue_as :default

  def perform(server_id, items)
    server = PlexServer.find(server_id)
    service = Plex::Server.new(server)

    Array(items).each do |item|
      item = item.with_indifferent_access
      next unless image_for(service, item[:id])

      ActionCable.server.broadcast(channel_name(server_id), { media_id: item[:id] })
    end
  end

  private

  def image_for(_service, _media_id)
    raise NotImplementedError, "#{self.class} must define #image_for"
  end

  def channel_name(_server_id)
    raise NotImplementedError, "#{self.class} must define #channel_name"
  end
end
