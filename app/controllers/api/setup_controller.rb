# frozen_string_literal: true

module Api
  class SetupController < ApplicationController
    allow_unauthenticated_access

    def show
      render json: { needed: !User.exists? }
    end

    def create
      if User.exists?
        render json: { error: "Setup already completed" }, status: :forbidden
        return
      end

      user = User.new(setup_params)
      if user.save
        start_new_session_for user
        render json: { email_address: user.email_address }
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def setup_params
      params.require(:user).permit(:email_address, :password, :password_confirmation)
    end
  end
end
