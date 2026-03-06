# frozen_string_literal: true

class SectionSerializer
  def self.serialize(sections)
    sections.map do |section|
      {
        title: section[:title],
        items: Array(section[:items])
      }
    end
  end
end
