# frozen_string_literal: true

module Plex
  class ConcurrentDetailFetcher
    def initialize(cache_store:, detail_fetcher:, thread_count:)
      @cache_store = cache_store
      @detail_fetcher = detail_fetcher
      @thread_count = thread_count
    end

    def fetch(items)
      queue = items.dup
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
        item = mutex.synchronize { queue.shift }
        break unless item

        detail = @cache_store.fetch(detail_cache_key(item)) { @detail_fetcher.fetch(item[:id]) }
        mutex.synchronize { result[item[:id]] = detail }
      end
    end

    def detail_cache_key(item)
      @cache_store.key('media', 'detail', item[:id], item[:updated_at], @cache_store.enrich_version)
    end
  end
end
