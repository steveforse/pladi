# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SessionsController do
  describe '#authenticated?' do
    let(:user) { create(:user) }
    let(:session_record) { user.sessions.create! }

    before { request.cookie_jar.signed[:session_id] = session_record.id }

    it 'resumes and returns current session' do
      expect(controller.send(:authenticated?)).to eq(session_record)
    end
  end

  describe '#after_authentication_url' do
    context 'when return path exists in session' do
      before { session[:return_to_after_authenticating] = '/api/history' }

      it 'returns the stored return path' do
        expect(controller.send(:after_authentication_url)).to eq('/api/history')
      end

      it 'clears return path from session' do
        controller.send(:after_authentication_url)
        expect(session[:return_to_after_authenticating]).to be_nil
      end
    end

    context 'when return path is absent' do
      it 'falls back to root url' do
        expect(controller.send(:after_authentication_url)).to eq('http://test.host/')
      end
    end
  end
end
