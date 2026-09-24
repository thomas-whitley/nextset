import { sessionFromAuthFragment } from '../authLink';

const ok = () => jest.fn().mockResolvedValue({ error: null });

describe('sessionFromAuthFragment', () => {
  it('sets the session from the fragment tokens', async () => {
    const setSession = ok();
    const result = await sessionFromAuthFragment({ access_token: 'a', refresh_token: 'r' }, setSession);
    expect(setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
    expect(result).toEqual({ kind: 'session' });
  });

  it('reports a Supabase error from the fragment without touching the session', async () => {
    const setSession = ok();
    const result = await sessionFromAuthFragment(
      { error: 'access_denied', error_description: 'Link expired' },
      setSession,
    );
    expect(setSession).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'link-error', description: 'Link expired' });
  });

  it('treats an error_code alone as a link error', async () => {
    const result = await sessionFromAuthFragment({ error_code: 'otp_expired' }, ok());
    expect(result).toEqual({ kind: 'link-error', description: undefined });
  });

  it('reports no tokens when either token is missing', async () => {
    const setSession = ok();
    expect(await sessionFromAuthFragment({ access_token: 'a' }, setSession)).toEqual({ kind: 'no-tokens' });
    expect(await sessionFromAuthFragment({}, setSession)).toEqual({ kind: 'no-tokens' });
    expect(setSession).not.toHaveBeenCalled();
  });

  it('reports a failed setSession', async () => {
    const setSession = jest.fn().mockResolvedValue({ error: new Error('bad jwt') });
    const result = await sessionFromAuthFragment({ access_token: 'a', refresh_token: 'r' }, setSession);
    expect(result).toEqual({ kind: 'failed' });
  });
});
