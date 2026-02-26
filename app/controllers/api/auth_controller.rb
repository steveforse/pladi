module Api
  class AuthController < ApplicationController
    skip_before_action :require_authentication, only: [:me]

    def me
      if Current.user
        render json: { email_address: Current.user.email_address }
      else
        render json: { error: "Unauthenticated" }, status: :unauthorized
      end
    end
  end
end
