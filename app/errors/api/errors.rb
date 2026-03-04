# frozen_string_literal: true

module Api
  module Errors
    class ApiError < StandardError
      attr_reader :status

      def initialize(message = 'Request failed', status: :unprocessable_content)
        super(message)
        @status = status
      end
    end

    class BadRequest < ApiError
      def initialize(message = 'Bad request')
        super(message, status: :bad_request)
      end
    end

    class Unauthorized < ApiError
      def initialize(message = 'Unauthenticated')
        super(message, status: :unauthorized)
      end
    end

    class Forbidden < ApiError
      def initialize(message = 'Forbidden')
        super(message, status: :forbidden)
      end
    end

    class NotFound < ApiError
      def initialize(message = 'Not found')
        super(message, status: :not_found)
      end
    end

    class Unprocessable < ApiError
      def initialize(message = 'Unprocessable request')
        super(message, status: :unprocessable_content)
      end
    end
  end
end
