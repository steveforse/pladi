Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  resource :session, only: [ :create, :destroy ]

  namespace :api do
    get :me, to: "auth#me"
    resources :movies, only: [:index] do
      collection do
        get :refresh
        get :enrich
      end
    end
  end

  root "application#index"
end
