// ==========================================================
// Your Cinema - Declarative Jenkins Pipeline
//
// Secrets configured in Jenkins as "Secret file" credentials:
//   your-cinema-backend-env  -> .env file for backend
//
// Jenkins credential IDs used (configure in
//   Manage Jenkins -> Credentials):
//   * your-cinema-backend-env   (Secret file)
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
        // --------------------------------------------------
        stage("Ensure Docker Network") {
            steps {
                sh """
                    if ! docker network inspect ${DOCKER_NETWORK} >/dev/null 2>&1; then
                        echo "Network ${DOCKER_NETWORK} not found - creating it..."
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
        // 5. Deploy
        // --------------------------------------------------
        stage("Deploy") {
            steps {
                sh """
                    if command -v docker-compose >/dev/null 2>&1; then
                        echo "Deploying with docker-compose..."
                        docker-compose -f docker-compose.yml down --remove-orphans || true
                        docker-compose -f docker-compose.yml up -d
                    elif docker compose version >/dev/null 2>&1; then
                        echo "Deploying with docker compose..."
                        docker compose -f docker-compose.yml down --remove-orphans || true
                        docker compose -f docker-compose.yml up -d
                    else
                        echo "Compose CLI not found on agent - deploying with docker CLI directly..."
                        docker stop your-cinema-frontend your-cinema-backend 2>/dev/null || true
                        docker rm -f your-cinema-frontend your-cinema-backend 2>/dev/null || true

                        docker run -d \
                            --name your-cinema-backend \
                            --restart unless-stopped \
                            --network ${DOCKER_NETWORK} \
                            --env-file backend/.env \
                            -e NODE_ENV=production \
                            -e DB_HOST=postgres \
                            -e DB_PORT=5432 \
                            -e CLIENT_URL=http://vijayott.duckdns.org \
                            -p 5000:5000 \
                            ${BACKEND_IMAGE}:latest

                        docker run -d \
                            --name your-cinema-frontend \
                            --restart unless-stopped \
                            --network ${DOCKER_NETWORK} \
                            -p 3000:80 \
                            ${FRONTEND_IMAGE}:latest
                    fi

                    echo "Waiting for backend to become healthy..."
                    for i in \$(seq 1 20); do
                        STATUS=\$(docker inspect --format="{{.State.Health.Status}}" your-cinema-backend 2>/dev/null || echo "not_found")
                        if [ "\$STATUS" = "healthy" ]; then
                            echo "Backend is healthy."
                            break
                        fi
                        echo "  Status: \$STATUS - waiting (attempt \$i/20)..."
                        sleep 6
                    done
                """
            }
        }

        // --------------------------------------------------
        // 6. Smoke Test
        // --------------------------------------------------
        stage("Smoke Test") {
            steps {
                sh """
                    echo "Testing backend container health..."
                    docker exec your-cinema-backend wget -qO- http://127.0.0.1:5000/api/health

                    echo "Testing frontend container..."
                    docker exec your-cinema-frontend wget -qO- http://127.0.0.1:80/ >/dev/null
                    echo "Frontend container is serving traffic."

                    echo "Testing frontend reverse proxy to backend..."
                    docker exec your-cinema-frontend wget -qO- http://127.0.0.1:80/api/health
                    echo "All smoke tests passed successfully."
                """
            }
        }

    }

    post {
        always {
            sh "rm -f backend/.env || true"
        }
        success {
            echo "Deployment succeeded - Your Cinema is live."
        }
        failure {
            echo "Deployment FAILED - check logs above."
            sh """
                if command -v docker-compose >/dev/null 2>&1; then
                    docker-compose -f docker-compose.yml logs --tail=100 || true
                elif docker compose version >/dev/null 2>&1; then
                    docker compose -f docker-compose.yml logs --tail=100 || true
                else
                    echo "=== Backend Logs ==="
                    docker logs --tail=100 your-cinema-backend || true
                    echo "=== Frontend Logs ==="
                    docker logs --tail=100 your-cinema-frontend || true
                fi
            """
        }
    }
}