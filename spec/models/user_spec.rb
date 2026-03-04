# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  describe 'email normalization' do
    let(:user) { create(:user, email_address: '  TeSt@Example.COM  ') }

    it 'strips and downcases the email address' do
      expect(user.email_address).to eq('test@example.com')
    end
  end

  describe 'password authentication' do
    let(:user) { create(:user, password: 'secret') }

    it 'authenticates with the correct password' do
      expect(user.authenticate('secret')).to eq(user)
    end

    it 'fails authentication with the wrong password' do
      expect(user.authenticate('wrong')).to be(false)
    end
  end
end
