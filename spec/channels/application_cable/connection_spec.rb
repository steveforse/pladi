# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ApplicationCable::Connection do
  let(:user) { create(:user) }

  it 'connects when signed session cookie is present' do
    session_record = user.sessions.create!
    cookies.signed[:session_id] = session_record.id
    connect '/cable'
    expect(connection.current_user).to eq(user)
  end

  it 'rejects when session cookie is missing' do
    expect { connect '/cable' }.to have_rejected_connection
  end
end
