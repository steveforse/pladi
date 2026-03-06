# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::MediaLibrariesController do
  subject(:controller_instance) { described_class.new }

  describe '#resource_param_key' do
    it 'requires subclasses to define the resource param key' do
      expect { controller_instance.send(:resource_param_key) }
        .to raise_error(NotImplementedError, /must define #resource_param_key/)
    end
  end
end
