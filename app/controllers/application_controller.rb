# frozen_string_literal: true

class ApplicationController < ActionController::Base
  include Authentication

  allow_browser versions: :modern
  skip_before_action :require_authentication, only: [:index]

  def index
    render inline: '', layout: 'application'
  end
end
