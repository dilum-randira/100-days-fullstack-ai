import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production';

const parsePort = (value: string | undefined, fallback: number): number => {
  const num = value ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const rawNodeEnv: NodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const port = parsePort(process.env.PORT, 4000);
const mongoUri = required('MONGO_URI', process.env.MONGO_URI);
const jwtAccessSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
const jwtRefreshSecret = required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const redisUrl = required('REDIS_URL', process.env.REDIS_URL);

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  redisUrl: string;
}

export const config: AppConfig = {
  port,
  nodeEnv: rawNodeEnv,
  mongoUri,
  jwt: {
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  },
  redisUrl,
};
apiVersion: v1
kind: Namespace
metadata:
  name: backend
---
# =========================
# INVENTORY SERVICE CONFIG
# =========================
apiVersion: v1
kind: ConfigMap
metadata:
  name: inventory-service-config
  namespace: backend
data:
  NODE_ENV: "production"
  PORT: "3000"
  MONGO_URI: "mongodb://inventory-mongo:27017/inventory"
  REDIS_URL: "redis://inventory-redis:6379"
  ANALYTICS_SERVICE_URL: "http://analytics-service.backend.svc.cluster.local:4002"
  AUTH_SERVICE_URL: "http://auth-service.backend.svc.cluster.local:4001"
---
apiVersion: v1
kind: Secret
metadata:
  name: inventory-service-secret
  namespace: backend
type: Opaque
data:
  JWT_ACCESS_SECRET: "BASE64_JWT_ACCESS_SECRET"
  JWT_REFRESH_SECRET: "BASE64_JWT_REFRESH_SECRET"
  OTHER_SECRET: "BASE64_OTHER_SECRET_VALUE"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
  namespace: backend
  labels:
    app: inventory-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inventory-service
  template:
    metadata:
      labels:
        app: inventory-service
    spec:
      containers:
        - name: inventory-service
          image: your-docker-registry/inventory-service:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef:
                name: inventory-service-config
            - secretRef:
                name: inventory-service-secret
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 15
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: inventory-service
  namespace: backend
  labels:
    app: inventory-service
spec:
  type: ClusterIP
  selector:
    app: inventory-service
  ports:
    - name: http
      port: 3000
      targetPort: http

---
# =====================
# AUTH SERVICE CONFIG
# =====================
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-service-config
  namespace: backend
data:
  NODE_ENV: "production"
  PORT: "4001"
  MONGO_URI: "mongodb://auth-mongo:27017/auth"
  REDIS_URL: "redis://auth-redis:6379"
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-service-secret
  namespace: backend
type: Opaque
data:
  JWT_ACCESS_SECRET: "BASE64_JWT_ACCESS_SECRET"
  JWT_REFRESH_SECRET: "BASE64_JWT_REFRESH_SECRET"
  PASSWORD_PEPPER: "BASE64_PASSWORD_PEPPER"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: backend
  labels:
    app: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: your-docker-registry/auth-service:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 4001
              name: http
          envFrom:
            - configMapRef:
                name: auth-service-config
            - secretRef:
                name: auth-service-secret
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 15
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: backend
  labels:
    app: auth-service
spec:
  type: ClusterIP
  selector:
    app: auth-service
  ports:
    - name: http
      port: 4001
      targetPort: http

---
# =========================
# ANALYTICS SERVICE CONFIG
# =========================
apiVersion: v1
kind: ConfigMap
metadata:
  name: analytics-service-config
  namespace: backend
data:
  NODE_ENV: "production"
  PORT: "4002"
  MONGO_URI: "mongodb://analytics-mongo:27017/analytics"
---
apiVersion: v1
kind: Secret
metadata:
  name: analytics-service-secret
  namespace: backend
type: Opaque
data:
  JWT_ACCESS_SECRET: "BASE64_JWT_ACCESS_SECRET"
  OTHER_ANALYTICS_SECRET: "BASE64_OTHER_ANALYTICS_SECRET"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  namespace: backend
  labels:
    app: analytics-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
        - name: analytics-service
          image: your-docker-registry/analytics-service:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 4002
              name: http
          envFrom:
            - configMapRef:
                name: analytics-service-config
            - secretRef:
                name: analytics-service-secret
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 15
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
  namespace: backend
  labels:
    app: analytics-service
spec:
  type: ClusterIP
  selector:
    app: analytics-service
  ports:
    - name: http
      port: 4002
      targetPort: http

---
# ================
# INGRESS (NGINX)
# ================
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: backend
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
    - host: your-backend.example.com
      http:
        paths:
          - path: /api/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 4001
          - path: /api/inventory
            pathType: Prefix
            backend:
              service:
                name: inventory-service
                port:
                  number: 3000
          - path: /api/analytics
            pathType: Prefix
            backend:
              service:
                name: analytics-