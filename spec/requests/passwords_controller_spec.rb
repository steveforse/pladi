# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PasswordsController do
  describe 'POST /passwords' do
    let(:params) { { email_address: email_address } }

    before { post passwords_path, params: params }

    context 'when user exists' do
      let(:user) { create(:user, email_address: 'reset@example.com') }
      let(:email_address) { user.email_address }

      it 'redirects to the login page' do
        expect(response).to redirect_to(new_session_path)
      end

      it 'sets a reset-sent notice' do
        expect(flash[:notice]).to eq('Password reset instructions sent (if user with that email address exists).')
      end
    end

    context 'when user does not exist' do
      let(:email_address) { 'missing@example.com' }

      it 'redirects to the login page' do
        expect(response).to redirect_to(new_session_path)
      end

      it 'sets the same reset-sent notice' do
        expect(flash[:notice]).to eq('Password reset instructions sent (if user with that email address exists).')
      end
    end
  end

  describe 'PATCH /passwords/:token' do
    let(:user) { create(:user, password: 'password') }
    let(:token) { user.password_reset_token }

    context 'when params are valid' do
      before do
        user.sessions.create!
        patch password_path(token), params: { password: 'new-pass', password_confirmation: 'new-pass' }
      end

      it 'redirects to the login page' do
        expect(response).to redirect_to(new_session_path)
      end

      it 'sets success notice' do
        expect(flash[:notice]).to eq('Password has been reset.')
      end

      it 'updates the user password' do
        expect(user.reload.authenticate('new-pass')).to eq(user)
      end

      it 'destroys existing sessions' do
        expect(user.reload.sessions).to be_empty
      end
    end

    context 'when params are invalid' do
      before do
        patch password_path(token), params: { password: 'new-pass', password_confirmation: 'nope' }
      end

      it 'redirects back to edit page' do
        expect(response).to redirect_to(edit_password_path(token))
      end

      it 'sets mismatch alert' do
        expect(flash[:alert]).to eq('Passwords did not match.')
      end

      it 'does not change password' do
        expect(user.reload.authenticate('password')).to eq(user)
      end
    end
  end

  describe 'GET /passwords/:token/edit' do
    context 'when token is invalid' do
      before { get edit_password_path('not-a-valid-token') }

      it 'redirects to the request form' do
        expect(response).to redirect_to(new_password_path)
      end

      it 'sets invalid-token alert' do
        expect(flash[:alert]).to eq('Password reset link is invalid or has expired.')
      end
    end
  end
end
