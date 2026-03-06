# frozen_string_literal: true

module Plex
  module TagFormatter
    module_function

    def join(entries)
      tags = Array(entries).pluck('tag').compact_blank.uniq
      tags.any? ? tags.join(', ') : nil
    end
  end
end
