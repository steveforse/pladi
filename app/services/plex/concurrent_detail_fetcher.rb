# frozen_string_literal: true

module Plex
  class ConcurrentDetailFetcher
    def initialize(cache_store:, detail_fetcher:, thread_count:)
      @cache_store = cache_store
      @detail_fetcher = detail_fetcher
      @thread_count = thread_count
    end

    def fetch(movies)
      queue = movies.dup
      mutex = Mutex.new
      result = {}

      Array.new(@thread_count) do
        Thread.new { process_queue(queue, mutex, result) }
      end.each(&:join)

      result
    end

    private

    def process_queue(queue, mutex, result)
      loop do
        movie = mutex.synchronize { queue.shift }
        break unless movie

        detail = @cache_store.fetch(detail_cache_key(movie)) { @detail_fetcher.fetch(movie[:id]) }
        mutex.synchronize { result[movie[:id]] = detail }
      end
    end

    def detail_cache_key(movie)
      @cache_store.key('movie', 'detail', movie[:id], movie[:updated_at], @cache_store.enrich_version)
    end
  end
end
