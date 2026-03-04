# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Plex::HttpClient do
  subject(:client) { described_class.new(server) }

  let(:server) { instance_double(PlexServer, url: 'http://plex.local:32400', token: 'plex-token') }
  let(:http) { instance_double(Net::HTTP) }
  let(:invalid_json_error) { 'Plex returned an unexpected response — check your server URL and token' }

  def build_response(klass, code:, body: nil, headers: {})
    response = klass.new('1.1', code, '')
    allow(response).to receive(:body).and_return(body) unless body.nil?
    headers.each { |k, v| allow(response).to receive(:[]).with(k).and_return(v) }
    response
  end

  describe '#get' do
    let(:response) { build_response(Net::HTTPOK, code: '200', body: '{"ok":true}') }

    before do
      allow(Net::HTTP).to receive(:start).and_yield(http)
      allow(http).to receive(:request).and_return(response)
    end

    it 'returns parsed json' do
      expect(client.get('/library')).to eq('ok' => true)
    end

    it 'sends token header' do
      captured_request = capture_get_request
      expect(captured_request['X-Plex-Token']).to eq('plex-token')
    end

    it 'raises for non-success status' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPUnauthorized, code: '401'))
      expect { client.get('/library') }.to raise_error(Plex::HttpClient::RequestError, 'Plex returned HTTP 401')
    end

    it 'raises for invalid json body' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPOK, code: '200', body: 'not-json'))
      expect { client.get('/library') }.to raise_error(Plex::HttpClient::RequestError, invalid_json_error)
    end

    it 'raises on invalid server url' do
      bad_client = described_class.new(instance_double(PlexServer, url: 'http:// bad', token: 't'))
      expect { bad_client.get('/library') }.to raise_error(Plex::HttpClient::RequestError, 'Plex server URL is invalid')
    end

    it 'raises on timeout' do
      allow(Net::HTTP).to receive(:start).and_raise(Net::ReadTimeout, 'timed out')
      expect { client.get('/library') }.to raise_error(Plex::HttpClient::RequestError, /Unable to reach Plex server:/)
    end
  end

  describe '#put' do
    before { allow(Net::HTTP).to receive(:start).and_yield(http) }

    it 'succeeds for success response' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPOK, code: '200'))
      expect(client.put('/library/metadata/1')).to be_nil
    end

    it 'raises for non-success response' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPUnauthorized, code: '401'))
      expect { client.put('/library/metadata/1') }.to raise_error(
        Plex::HttpClient::RequestError, 'Plex returned HTTP 401'
      )
    end
  end

  describe '#get_image' do
    before { allow(Net::HTTP).to receive(:start).and_yield(http) }

    it 'returns image payload for success response' do
      allow(http).to receive(:request).and_return(
        build_response(Net::HTTPOK, code: '200', body: 'img', headers: { 'Content-Type' => 'image/png' })
      )
      expect(client.get_image('/library/metadata/1/thumb')).to eq(data: 'img', content_type: 'image/png')
    end

    it 'defaults content type when missing' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPOK, code: '200', body: 'img'))
      expect(client.get_image('/library/metadata/1/thumb')).to eq(data: 'img', content_type: 'image/jpeg')
    end

    it 'returns nil for non-success response' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPNotFound, code: '404'))
      expect(client.get_image('/library/metadata/1/thumb')).to be_nil
    end

    it 'follows redirects for image response' do
      allow(http).to receive(:request).and_return(redirect_response, redirected_success_response)
      expect(client.get_image('/library/metadata/1/thumb')).to eq(data: 'img', content_type: 'image/jpeg')
    end

    it 'returns nil for redirect response without location' do
      allow(http).to receive(:request).and_return(build_response(Net::HTTPFound, code: '302'))
      expect(client.get_image('/library/metadata/1/thumb')).to be_nil
    end
  end

  def capture_get_request
    captured_request = nil
    allow(http).to receive(:request) do |request|
      captured_request = request
      build_response(Net::HTTPOK, code: '200', body: '{"ok":true}')
    end
    client.get('/library')
    captured_request
  end

  def redirect_response
    build_response(Net::HTTPFound, code: '302', headers: { 'Location' => 'https://cdn.example.com/poster.jpg' })
  end

  def redirected_success_response
    build_response(Net::HTTPOK, code: '200', body: 'img')
  end
end
