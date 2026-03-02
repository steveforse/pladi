# frozen_string_literal: true

module Api
  class AccountController < ApplicationController
    def update
      user = Current.user
      if user.update(account_params)
        render json: { email_address: user.email_address }
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_content
      end
    end

    private

    def account_params
      permitted = params.expect(user: %i[email_address password password_confirmation download_images])
      permitted.delete(:password_confirmation) if permitted[:password].blank?
      permitted.delete(:password) if permitted[:password].blank?
      permitted
    end
  end
end
