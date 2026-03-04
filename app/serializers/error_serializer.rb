# frozen_string_literal: true

class ErrorSerializer
  def self.error(message)
    { error: message }
  end

  def self.errors(messages)
    { errors: Array(messages) }
  end
end
