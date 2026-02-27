class WarmPostersJob < ApplicationJob
  queue_as :default

  def perform(server_id, movies)
    server = PlexServer.find(server_id)
    service = PlexService.new(server)
    movies.each do |movie|
      thumb = movie["thumb"] || movie[:thumb]
      id = movie["id"] || movie[:id]
      service.warm_poster(id, thumb)
      ActionCable.server.broadcast("posters_#{server_id}", { rating_key: id })
    end
  end
end
