class Tank < Formula
  desc "Security-first package manager for AI agent skills"
  homepage "https://tankpkg.dev"
  version "0.1.9"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-arm64.tar.gz"
    sha256 "d91f37c9157b2454ee7a6e8f1967efcf1b524730225522a4c409eb73ef14523a"
  elsif OS.mac?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-darwin-x64.tar.gz"
    sha256 "1f1c9ace435c03d12b54f2426b320ef4f6af78874fbd1653e1d2b759ff273c60"
  elsif OS.linux? && Hardware::CPU.arm?
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-arm64.tar.gz"
    sha256 "327d80ecc1bbf1c42c5ce40ea9986309bd239b11c3b533d0ec2c33226261cf98"
  else
    url "https://github.com/tankpkg/tank/releases/download/v#{version}/tank-linux-x64.tar.gz"
    sha256 "091d214df09b87f8774cef0ea7a7662980c763686bfe877128375d0c5fe9467b"
  end

  def install
    bin.install "tank-#{OS.mac? ? \"darwin\" : \"linux\"}-#{Hardware::CPU.arm? ? \"arm64\" : \"x64\"}" => "tank"
  end

  test do
    system "#{bin}/tank", "--version"
  end
end
