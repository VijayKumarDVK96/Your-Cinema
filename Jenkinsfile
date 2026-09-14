// ==========================================================
// Your Cinema — Declarative Jenkins Pipeline
//
// Secrets configured in Jenkins as "Secret file" credentials:
//   your-cinema-backend-env  ? .env file for backend
//
// Jenkins credential IDs used (configure in
//   Manage Jenkins ? Credentials):
//   • your-cinema-backend-env   (Secret file)
//
// Environment variables injected at pipeline level:
//   • DOCKER_REGISTRY    (e.g. "registry.example.com" or "")
//   • BACKEND_IMAGE_TAG  (defaults to build number)
//   • FRONTEND_IMAGE_TAG (defaults to build number)
// ==========================================================

pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "your-cinema"
        BACKEND_IMAGE        = "your-cinema-backend"
        FRONTEND_IMAGE       = "your-cinema-frontend"
        IMAGE_TAG            = "${env.BUILD_NUMBER}"
        DOCKER_NETWORK       = "postgresql_postgres_network"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: "10"))
        disableConcurrentBuilds()
        timeout(time: 30, unit: "MINUTES")
        timestamps()
    }

    stages {

        // --------------------------------------------------
        // 1. Checkout
        // --------------------------------------------------
        stage("Checkout") {
            steps {
                checkout scm
                sh "git log -1 --format='%h %s'"
            }
        }

        // --------------------------------------------------
        // 2. Prepare env files from Jenkins Secret files
        // --------------------------------------------------
        stage("Prepare Environment Files") {
            steps {
                // Inject the backend .env from the Jenkins Secret file credential
                withCredentials([
                    file(credentialsId: "your-cinema-backend-env", variable: "BACKEND_ENV_FILE")
                ]) {
                    sh """
                        cp "\${BACKEND_ENV_FILE}" backend/.env
                        echo "Backend .env injected successfully"
                    """
                }
            }
        }

        // --------------------------------------------------
        // 3. Ensure the external Docker network exists
        //    (created by the PostgreSQL stack already, but
        //     this step ensures CI never fails if it`s absent)
        // --------------------------------------------------
        stage("Ensure Docker Network") {
            steps {
                sh """
                    if ! docker network inspect ${DOCKER_NETWORK} >/dev/null 2>&1; then
                        echo "Network ${DOCKER_NETWORK} not found — creating it..."
                        docker network create --driver bridge ${DOCKER_NETWORK}
                    else
                        echo "Network ${DOCKER_NETWORK} already exists"
                    fi
                """
            }
        }

        // --------------------------------------------------
        // 4. Build Docker images
        // --------------------------------------------------
        stage("Build Images") {
            parallel {
                stage("Build Backend") {
                    steps {
                        sh """
                            docker build \
                                --target production \
                                -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                                -t ${BACKEND_IMAGE}:latest \
                                ./backend
                        """
                    }
                }
                stage("Build Frontend") {
                    steps {
                        sh """
                            docker build \
                                --target production \
                                --build-arg VITE_API_URL=http://vijayott.duckdns.org \
                                -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                                -t ${FRONTEND_IMAGE}:latest \
                                ./frontend
                        """
                    }
                }
            }
        }

        // --------------------------------------------------
        // 5. Deploy (stop old ? start new via docker compose)
        // --------------------------------------------------
        stage("Deploy") {
            steps {
                sh """
                    # Bring down existing stack gracefully
                    docker compose -f docker-compose.yml down --remove-orphans || true

                    # Start new stack in detached mode
                    docker compose -f docker-compose.yml up -d --build

                    # Wait for backend health
                    echo "Waiting for backend to become healthy..."
                    for i in \$(seq 1 20); do
                        STATUS=\$(docker inspect --format="{{.State.Health.Status}}" your-cinema-backend 2>/dev/null || echo "not_found")
                        if [ "\$STATUS" = "healthy" ]; then
                            echo "Backend is healthy."
                            break
                        fi
                        echo "  Status: \$STATUS — waiting (attempt \$i/20)..."
                        sleep 6
                    done
                """
            }
        }

        // --------------------------------------------------
        // 6. Smoke Test — confirm services are responding
        // --------------------------------------------------
        stage("Smoke Test") {
            steps {
                sh """
                    echo "Testing backend health endpoint..."
                    curl -fsSL http://localhost:5000/api/health | python3 -m json.tool

                    echo "Testing frontend..."
                    curl -fsSL -o /dev/null -w "Frontend HTTP status: %{http_code}\\n" http://vijayott.duckdns.org/ || curl -fsSL -o /dev/null -w "Frontend HTTP status (local): %{http_code}\\n" http://localhost:3000/
                """
            }
        }

    }

    post {
        always {
            // Clean up the injected .env (do not leave secrets on disk)
            sh "rm -f backend/.env || true"
        }
        success {
            echo "? Deployment succeeded — Your Cinema is live on :3000"
        }
        failure {
            echo "? Deployment FAILED — check logs above"
            // Collect container logs for debugging
            sh """
                docker compose -f docker-compose.yml logs --tail=100 || true
            """
        }
    }
}
