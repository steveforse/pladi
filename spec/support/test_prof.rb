# frozen_string_literal: true

if ENV['TEST_PROF'] == 'true'
  require 'test_prof'
  require 'test_prof/recipes/rspec/let_it_be'
end
