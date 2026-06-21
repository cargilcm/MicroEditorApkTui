
          # 1. Read the version from your existing properties file
          DIST_URL=$(grep "distributionUrl" android/gradle/wrapper/gradle-wrapper.properties | cut -d'=' -f2)
          VERSION=$(echo "$DIST_URL" | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.]+)?')
          echo "Detected Gradle Version: $VERSION"
          
          # 2. Safely download a clean wrapper JAR from official Gradle sources
          curl -SLo android/gradle/wrapper/gradle-wrapper.jar "https://githubusercontent.com/{$VERSION}/gradle/wrapper/gradle-wrapper.jar"
