# frozen_string_literal: true

module Api
  class SetupController < BaseController
    allow_unauthenticated_access

    def show
      render json: { needed: !User.exists? }
    end

    def create
      raise Api::Errors::Forbidden, 'Setup already completed' if User.exists?

      user = User.new(setup_params)
      if user.save
        start_new_session_for user
        render json: { email_address: user.email_address }
      else
        render_errors(user.errors.full_messages)
      end
    end

    private

    def setup_params
      params.expect(user: %i[email_address password password_confirmation])
    end
  end
end
