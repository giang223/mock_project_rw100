package com.minisocial.repository;

import com.minisocial.entity.OAuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {

    Optional<OAuthIdentity> findByProviderAndProviderSubject(
            OAuthIdentity.Provider provider, String providerSubject);
}
