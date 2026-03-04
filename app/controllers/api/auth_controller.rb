# frozen_string_literal: true

module Api
  class AuthController < BaseController
    allow_unauthenticated_access only: [:me]

    def me
      resume_session
      raise Api::Errors::Unauthorized, 'Unauthenticated' unless Current.user

      render json: { email_address: Current.user.email_address, download_images: Current.user.download_images }
    end
  end
end
