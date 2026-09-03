SHELL := /bin/bash
NVM_EXEC := source ~/.nvm/nvm.sh 2>/dev/null || true; nvm use 2>/dev/null || true;

.PHONY: help install dev dev-frontend build test db-init-local db-init-remote deploy clean

help: ## Mevcut komutları ve açıklamalarını listeler
	@echo "Kullanılabilir Make Komutları:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Bağımlılıkları yükler
	@$(NVM_EXEC) npm install

dev: ## Cloudflare Worker ve yerel veritabanı ile geliştirme ortamını başlatır
	@$(NVM_EXEC) npm run dev

dev-frontend: ## Yalnızca Vite React arayüz geliştirme sunucusunu başlatır
	@$(NVM_EXEC) npm run dev:frontend

build: ## Frontend'i derler ve Cloudflare Worker tip kontrollerini yapar
	@$(NVM_EXEC) npm run build

test: ## Otomatik testleri çalıştırır
	@$(NVM_EXEC) npm test

db-init-local: ## Yerel Cloudflare D1 veritabanı şemasını (schema.sql) uygular
	@$(NVM_EXEC) npm run d1:init-local

db-init-remote: ## Canlı (remote) Cloudflare D1 veritabanı şemasını doğrudan sorgu ile uygular
	@$(NVM_EXEC) npm run d1:init-remote

deploy: ## Projeyi derler ve Cloudflare Worker'a canlıya alır
	@$(NVM_EXEC) npm run deploy

clean: ## Derleme çıktılarını (dist/) ve geçici dosyaları temizler
	@rm -rf dist
