# frozen_string_literal: true

Rails.application.routes.draw do
  get 'up' => 'rails/health#show', as: :rails_health_check
  mount ActionCable.server => '/cable'

  resource :session, only: %i[create destroy]

  namespace :api do
    get :me, to: 'auth#me'
    resources :movies, only: [:index] do
      collection do
        get :refresh
        get :enrich
      end
      member do
        get :poster
      end
    end
    resources :plex_servers, only: %i[index create update destroy] do
      collection { get :lookup_name }
    end
  end

  root 'application#index'
end
