# frozen_string_literal: true

Rails.application.routes.draw do
  get 'up' => 'rails/health#show', as: :rails_health_check
  mount ActionCable.server => '/cable'
  resource :session, only: %i[new create destroy]
  resources :passwords, param: :token, only: %i[new create edit update]

  namespace :api do
    resource :setup, only: %i[show create], controller: 'setup'
    resource :account, only: [:update], controller: 'account'
    get :me, to: 'auth#me'
    resources :history, only: [:index]
    resources :movies, only: %i[index show update] do
      collection do
        get :refresh
        get :enrich
        post :warm_posters
        post :warm_backgrounds
      end
      member do
        get :poster
        get :background
      end
    end
    resources :shows, only: %i[index show update] do
      collection do
        get :refresh
        get :enrich
      end
    end
    resources :plex_servers, only: %i[index create update destroy] do
      get :lookup_name, on: :collection
    end
  end

  root 'application#index'
end
