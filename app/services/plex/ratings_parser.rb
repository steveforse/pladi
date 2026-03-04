# frozen_string_literal: true

module Plex
  class RatingsParser
    def parse(item)
      ratings = item['Rating'] || []

      {
        imdb_rating: rating_for(ratings, prefix: 'imdb://'),
        rt_critics_rating: rating_for(ratings, prefix: 'rottentomatoes://', type: 'critic'),
        rt_audience_rating: rating_for(ratings, prefix: 'rottentomatoes://', type: 'audience'),
        tmdb_rating: rating_for(ratings, prefix: 'themoviedb://')
      }
    end

    private

    def rating_for(ratings, prefix:, type: nil)
      ratings.find do |rating|
        next false unless rating['image'].to_s.start_with?(prefix)
        next true if type.nil?

        rating['type'] == type
      end&.dig('value')
    end
  end
end
