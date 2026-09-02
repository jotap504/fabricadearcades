export interface MLTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  user_id: number
  refresh_token?: string
}

export interface MLUserInfo {
  id: number
  nickname: string
  email?: string
  site_id: string
}
