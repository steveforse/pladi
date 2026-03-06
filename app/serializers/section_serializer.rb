# frozen_string_literal: true

class SectionSerializer
  def self.serialize(sections)
    sections.map { |section| section.slice(:title, :items) }
  end
end
