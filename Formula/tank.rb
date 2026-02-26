class Tank < Formula
  desc "Security-first package manager for AI agent skills"
  homepage "https://tankpkg.dev"
  version "0.1.8"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-arm64.tar.gz"
    sha256 "d53cf3c5c3941cb4bfae74a303e64a126818c7aa743d45de24da88440958461c"
  elsif OS.mac?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-x64.tar.gz"
    sha256 "a3955348f1a8733fe095837bf239002f75e4309e90d96a4c7cb23874a9b6214b"
  elsif OS.linux? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-arm64.tar.gz"
    sha256 "b4718340c888b11a8aac0e507b81ee1e731c092d16143b1b2a2fc37080b221e1"
  else
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-x64.tar.gz"
    sha256 "87c814227e918f01c0ad7e6537d2dc57420d4b23426a87849ad64989e1fd8831"
  end

  def install
    bin.install "tank-#{OS.mac? ? \"darwin\" : \"linux\"}-#{Hardware::CPU.arm? ? \"arm64\" : \"x64\"}" => "tank"
  end

  test do
    system "#{bin}/tank", "--version"
  end
end
