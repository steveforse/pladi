# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::AccountController do
  describe 'PATCH /api/account' do
    let(:user) { create(:user, email_address: 'owner@example.com', download_images: false) }

    before { sign_in_as(user) }

    context 'with valid params and blank password' do
      let(:params) do
        {
          user: {
            email_address: 'new-owner@example.com',
            password: '',
            password_confirmation: '',
            download_images: true
          }
        }
      end

      before { patch '/api/account', params:, as: :json }

      it 'returns ok' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns updated email in payload' do
        expect(json_body).to eq('email_address' => 'new-owner@example.com')
      end

      it 'updates the email' do
        expect(user.reload.email_address).to eq('new-owner@example.com')
      end

      it 'updates the download preference' do
        expect(user.reload.download_images).to be(true)
      end

      it 'keeps the existing password' do
        expect(user.reload.authenticate('password')).to eq(user)
      end
    end

    context 'with invalid password confirmation' do
      let(:params) do
        {
          user: {
            email_address: 'new-owner@example.com',
            password: 'new-password',
            password_confirmation: 'mismatch'
          }
        }
      end

      before { patch '/api/account', params:, as: :json }

      it 'returns validation errors' do
        expect(response).to have_api_errors(status: :unprocessable_content)
      end

      it 'does not change the existing password' do
        expect(user.reload.authenticate('password')).to eq(user)
      end
    end
  end
end
