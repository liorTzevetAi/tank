class Tank < Formula
  desc "Security-first package manager for AI agent skills"
  homepage "https://tankpkg.dev"
  version "0.1.7"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-arm64.tar.gz"
    sha256 "d6300c6f85bf76358fdf1940acde8160ebbc3ba36d6d16360b388ab478b1e928"
  elsif OS.mac?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-x64.tar.gz"
    sha256 "e9ad31eebdae5ecabe7f0d69ee1afb859a06edac57be943303777797263e7f94"
  elsif OS.linux? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-arm64.tar.gz"
    sha256 "fd5d5f9e9ccabfc81e99d415086ba4dc4cecbbe527473e6d127ad7b49f03b87c"
  else
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-x64.tar.gz"
    sha256 "2c1f9b85219e1fc7e6a4d49f8ace7ad73518084e36e6a50cc3477c50a81c97a5"
  end

  def install
    bin.install "tank-#{OS.mac? ? \"darwin\" : \"linux\"}-#{Hardware::CPU.arm? ? \"arm64\" : \"x64\"}" => "tank"
  end

  test do
    system "#{bin}/tank", "--version"
  end
end
