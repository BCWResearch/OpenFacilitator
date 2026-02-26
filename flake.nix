{
  description = "Dev shell for stakefi-developer-api";

  inputs = {
    # Updated to 25.11 for the latest Python 3.14 support
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        nodejs = pkgs.nodejs_20;
        prisma-engines = pkgs.prisma-engines;
      in
      {
        devShells.default = pkgs.mkShell {
          name = "stakefi-dev-shell";

          buildInputs = [
            nodejs
            pkgs.python314 # The 3.14 you requested
            pkgs.pnpm
            pkgs.sqlite
            pkgs.typescript
            pkgs.protobuf
            pkgs.just
            pkgs.docker
            pkgs.docker-compose
            pkgs.docker-buildx
            prisma-engines
            pkgs.openssl

            # --- Native Compilation Dependencies ---
            pkgs.pkg-config # Helps node-gyp find system libs
            pkgs.systemd # Provides libudev.h
            pkgs.stdenv.cc.cc # Standard C++ compiler headers
            pkgs.libusb1 # Often needed alongside the 'usb' node package
          ];

          shellHook = ''
            # Prisma environment variables
            export PRISMA_SCHEMA_ENGINE_BINARY="${prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${prisma-engines}/bin/query-engine"
            export PRISMA_CLIENT_ENGINE_TYPE="binary"

            # Fix for node-gyp and native C modules:
            # This tells the compiler where to find the udev headers
            export PKG_CONFIG_PATH="${pkgs.systemd.dev}/lib/pkgconfig:${pkgs.libusb1.dev}/lib/pkgconfig"

            # Node Modules installation
            echo "📦 Installing node modules..."
            if [ ! -d node_modules ]; then
              pnpm install --frozen-lockfile
            fi

            echo "🐍 Python: $(python3 --version) | Node: $(node --version)"
            echo "✅ Dev environment ready."
          '';
        };
      }
    );
}
