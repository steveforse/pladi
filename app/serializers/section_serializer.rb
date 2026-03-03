# frozen_string_literal: true

class SectionSerializer
  def self.serialize(sections)
    sections.map { |s| s.slice(:title, :movies) }
  end
end
